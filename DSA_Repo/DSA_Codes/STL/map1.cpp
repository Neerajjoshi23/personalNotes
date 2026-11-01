//map is data structure that store key value pair. kisi v key ke liye value store kr skte. 
//multimaps is used very rare
// int  string
// 1     abc
//5       cde
//3    acd
// normal map me keys sorted order me store hota. pehle 1 then 3 then 5
// unordered map me sorted hona jaruri nhi
// map is not of contiguous nature. so it + 1 cannot be used.
// it++ can be used
#include<bits/stdc++.h>
using namespace std;
int main(){
    map<string, string>m;
    m["yebra"] = "abc";
    m["apple"] = "cdc";
    m["zeb"] = "acd";
    m.insert({"sonal", "afg"});
    map<string, string> :: iterator it;
    for(it =m.begin(); it !=m.end(); ++it)
    cout<<(it->first) <<" "<<(*it).second <<endl;
    //keys will be printed in sorted order.
    //agr string rhega to wo v increasing order me store hoga dictionary ke according
}