#include <bits/stdc++.h>
using namespace std;
int SumOfKsubArray(int *arr,int n,int k){
    int ans=0;
    deque<int>maxQueue,minQueue;
    // for first window
    // maxQueue will have the maximim element in current window and have element in decreasing order
    // minQueue just oppposite of maxqueue

    for(int i=0;i<k;i++){

        while(!maxQueue.empty() &&   arr[maxQueue.back()]<=arr[i]){
            maxQueue.pop_back();
        }
          while(!minQueue.empty() &&   arr[minQueue.back()]>=arr[i]){
            minQueue.pop_back();
        }
        maxQueue.push_back(i);
        minQueue.push_back(i);
    }
    ans+=arr[maxQueue.front()]+arr[minQueue.front()];
    for(int i=k;i<n;i++){
       // removing out of Range elments
          while(!maxQueue.empty() &&   maxQueue.front()<=i-k ){
            maxQueue.pop_front();
        }
          while(!minQueue.empty() &&    minQueue.front()<=i-k){
            minQueue.pop_front();
        }
        //Add 

          while(!maxQueue.empty() &&   arr[maxQueue.back()]<=arr[i]){
            maxQueue.pop_back();
        }
          while(!minQueue.empty() &&   arr[minQueue.back()]>=arr[i]){
            minQueue.pop_back();
        }
        maxQueue.push_back(i);
        minQueue.push_back(i);
         ans+=arr[maxQueue.front()]+arr[minQueue.front()];

    }


    return ans;

}
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

     int arr[] = {2, 5, -1, 7, -3, -1, -2} ;
    int n = sizeof(arr)/sizeof(arr[0]);
    int k = 3;
    cout << SumOfKsubArray(arr, n, k) ;
    return 0;

    return 0;
}