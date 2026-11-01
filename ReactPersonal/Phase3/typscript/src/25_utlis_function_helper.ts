// ReturnType<T>
// Parameters<T>
// InstanceTpes<Ctor>
// constrcutorParameter<C>
function getUserInfo(id: string, isLoggable: boolean = true) {
  return {
    id: id,
    name: "neeraj",
    logs: isLoggable ? 12 : (undefined as undefined | string),
  };
}
// define the return type and parameter types of the getUserInfo function
type UserInfo = ReturnType<typeof getUserInfo>;
// define the parameter types of the getUserInfo function
type UserInfoParams = Parameters<typeof getUserInfo>;
const userInfoParamsExample: UserInfoParams = ["123", true];
const userInfoExample: UserInfo = getUserInfo(...userInfoParamsExample);
console.log(userInfoExample);

class Person {
  constructor(
    public id: string,
    public name: string,
  ) {
    console.log(`Person created with id: ${id} and name: ${name}`);
    this.id = id;
    this.name = name;
  }
  greet() {
    console.log(`Hello, my name is ${this.name} and my id is ${this.id}`);
  }
  setName(newName: string) {
    this.name = newName;
  }
}
// define the instance type of the Person class
// question what is InstanceType and how it works
// Answer: InstanceType<T> is a utility type in TypeScript that takes a constructor function type and returns the instance type that the constructor produces.
// In this case, it takes the Person class constructor and returns the type of an instance of Person.
// question then as we know class is just a function under the hood, can we use InstanceType with any function?
// Answer: No, InstanceType only works with constructor functions (functions that can be called with the 'new' keyword).
// Regular functions that are not constructors will not work with InstanceType.
// question can you explain in detail?
// Answer: Sure. When you have a class in TypeScript, it is essentially a constructor function under the hood.
// The InstanceType<T> utility type takes this constructor function type and gives you the type of the object that is created when you use the 'new' keyword with that constructor.
// For example, in the case of the Person class, InstanceType<typeof Person> will give you the type of an instance of Person, which includes all the public properties and methods defined in the class.
// question first tell as we know function are also object which are callable correct me if iam wrong and in class
// also classes are functions under the hood, so technically they are callable objects as well. and the method are in prototype of the user.prototype mean
// methods are linked there but porperties are object level defined mean for each object they will new class field?
// Answer: Yes, you are correct. Functions in JavaScript are objects that are callable. Classes are also functions under the hood, so they are callable objects as well.
// The methods defined in a class are actually placed on the prototype of the class, which means all instances share the same method definitions.
// On the other hand, properties defined in the class constructor (or as class fields) are created for each instance individually, so each object gets its own copy of these properties.
// now again explain instance type where all it use with exmaple
// Answer: The InstanceType<T> utility type is used to extract the instance type from a class constructor.
// This is useful when you want to refer to the type of an instance of a class without directly using the class name.
// For example, in the code below, PersonInstance is the type of an instance of the Person class.
// This allows you to create variables of type PersonInstance and ensures they have the correct structure and methods as defined in the Person class.
// this only used for class?
// Answer: Yes, InstanceType<T> is specifically designed to work with class constructors. It will not work with regular functions that are not constructors.
type PersonInstance = InstanceType<typeof Person>;
const personExample: PersonInstance = new Person("123", "neeraj");
personExample.greet();
personExample.setName("newName");
personExample.greet();
class Animal {
  name = "animal";
  constructor(name: string) {
    this.speak();
    this.name = name;
    console.log(`Animal created with name: ${this.name}`);
  }
  speak() {
    console.log(`${this.name} makes a sound.`);
  }
}
class Dog extends Animal {
  name = "dog";
  constructor(name: string) {
    super(name);
    this.speak();
    console.log(`Dog created with name: ${this.name}`);
    this.name = name;
  }
  speak() {
    console.log(`${this.name} barks.`);
  }
}
const dogExample = new Dog("Buddy");
dogExample.speak();
// answer will first super will be called then call will go to base class constrcutor where name will be set name=animal
// then when this.speak() is called which function be called is of Dog na?
// Yes, even though the speak() method is called from the Animal constructor, the actual method that gets executed is the one defined in the Dog class due to JavaScript's method resolution order (dynamic dispatch).
// and then after constrcutor of dog will be called then its class feild will be initialized, setting name to "dog" before the rest of the constructor executes.
// why dog speak is called?
// The reason the Dog's speak method is called instead of Animal's is due to JavaScript's dynamic method dispatch. When a method is called on an object, JavaScript looks up the method starting from the actual object's class (in this case, Dog) rather than the class where the method call originated (Animal).
// This behavior ensures that the most specific implementation of a method is executed, which is particularly important in inheritance hierarchies where subclasses override methods of their parent classes.
// no my question when speak is called this is not defined for dog then how it know which one to call is due method are DOG.proptype?
// When the speak method is called from the Animal constructor, `this` refers to the instance of Dog being created. At that point, the Dog instance exists, and its prototype chain includes the Dog's speak method. JavaScript uses the actual object's prototype chain to resolve method calls, so it finds Dog's speak method even though the call originated in the Animal constructor.
// In other words, even though the Dog's own constructor hasn't finished executing and its class field hasn't been initialized yet, the method resolution still correctly identifies the Dog's speak method because the object being constructed is already an instance of Dog.
// just revising this js part not Ts
type ConstructorParamsExample = ConstructorParameters<typeof Dog>;
const constructorParamsExample: ConstructorParamsExample = ["Buddy"];
// is this need to be an array or tuple?
// Answer: ConstructorParameters returns a tuple type representing the types of the parameters of the constructor. So yes, it should be a tuple.
//same Parameter<type of func>?
// Parameters<typeof func> returns a tuple type representing the types of the parameters of the function.
// const dogExampleFromConstructorParams = new Dog(...constructorParamsExample);
// console.log(dogExampleFromConstructorParams);
// dogExampleFromConstructorParams.speak();

// above in class first class fields are set then constructor is called?
// Answer: Yes, in JavaScript (and TypeScript), class fields are initialized before the constructor body is executed. This means that when the constructor runs, the class fields have already been set to their initial values.
// no exception to this rule; class fields are always initialized before the constructor body runs.
//
